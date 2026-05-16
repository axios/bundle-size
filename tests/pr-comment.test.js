import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { BUNDLE_SIZE_COMMENT_MARKER } from '../lib/comment.js';
import {
  getPullRequestNumberFromEvent,
  upsertPullRequestComment,
} from '../lib/pr-comment.js';

async function withGithubEnvironment(payload, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-size-pr-'));
  const eventPath = path.join(tempRoot, 'event.json');
  const keys = ['GITHUB_EVENT_PATH', 'GITHUB_REPOSITORY'];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  try {
    await writeFile(eventPath, `${JSON.stringify(payload)}\n`, 'utf8');
    process.env.GITHUB_EVENT_PATH = eventPath;
    process.env.GITHUB_REPOSITORY = 'axios/bundle-size';

    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await rm(tempRoot, { force: true, recursive: true });
  }
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 403 ? 'Forbidden' : 'OK',
    headers: {
      get: (name) => headers[name.toLowerCase()] ?? null,
    },
    json: async () => body,
  };
}

test('getPullRequestNumberFromEvent reads pull request event payloads', async () => {
  await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
    assert.equal(await getPullRequestNumberFromEvent(), 42);
  });
});

test('getPullRequestNumberFromEvent returns null without a pull request number', async () => {
  await withGithubEnvironment({ ref: 'refs/heads/main' }, async () => {
    assert.equal(await getPullRequestNumberFromEvent(), null);
  });
});

test('upsertPullRequestComment updates an existing marked comment', async () => {
  const originalFetch = global.fetch;
  const requests = [];

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, options });

      if (options.method === 'GET') {
        return jsonResponse(200, [
          {
            id: 12,
            body: `existing\n${BUNDLE_SIZE_COMMENT_MARKER}`,
            user: { login: 'github-actions[bot]', type: 'Bot' },
          },
        ]);
      }

      assert.equal(options.method, 'PATCH');
      assert.equal(url, 'https://api.github.com/repos/axios/bundle-size/issues/comments/12');
      assert.deepEqual(JSON.parse(options.body), { body: 'new body' });
      return jsonResponse(200, { id: 12, body: 'new body' });
    };

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, 'https://api.github.com/repos/axios/bundle-size/issues/42/comments?per_page=100');
    assert.equal(requests[0].options.headers.authorization, 'Bearer token-value');
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment updates marked comments from other bot tokens', async () => {
  const originalFetch = global.fetch;
  const requests = [];

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, options });

      if (options.method === 'GET') {
        return jsonResponse(200, [
          {
            id: 14,
            body: `existing app bot comment\n${BUNDLE_SIZE_COMMENT_MARKER}`,
            user: { login: 'bundle-size-app[bot]', type: 'Bot' },
          },
        ]);
      }

      assert.equal(options.method, 'PATCH');
      assert.equal(url, 'https://api.github.com/repos/axios/bundle-size/issues/comments/14');
      assert.deepEqual(JSON.parse(options.body), { body: 'new body' });
      return jsonResponse(200, { id: 14, body: 'new body' });
    };

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });

    assert.deepEqual(
      requests.map((request) => request.options.method),
      ['GET', 'PATCH'],
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment updates marked comments from personal access tokens', async () => {
  const originalFetch = global.fetch;
  const requests = [];

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, options });

      if (options.method === 'GET') {
        return jsonResponse(200, [
          {
            id: 12,
            body: `existing PAT-authored comment\n${BUNDLE_SIZE_COMMENT_MARKER}`,
            user: { login: 'octocat', type: 'User' },
          },
        ]);
      }

      assert.equal(options.method, 'PATCH');
      assert.equal(url, 'https://api.github.com/repos/axios/bundle-size/issues/comments/12');
      assert.deepEqual(JSON.parse(options.body), { body: 'new body' });
      return jsonResponse(200, { id: 12, body: 'new body' });
    };

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });

    assert.deepEqual(
      requests.map((request) => request.options.method),
      ['GET', 'PATCH'],
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment searches paginated comments before creating', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  const nextUrl = 'https://api.github.com/repos/axios/bundle-size/issues/42/comments?per_page=100&page=2';

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, options });

      if (options.method === 'GET' && !String(url).includes('page=2')) {
        return jsonResponse(
          200,
          [{ id: 1, body: 'first page comment' }],
          { link: `<${nextUrl}>; rel="next"` },
        );
      }

      if (options.method === 'GET') {
        assert.equal(url, nextUrl);
        return jsonResponse(200, [
          {
            id: 99,
            body: `second page\n${BUNDLE_SIZE_COMMENT_MARKER}`,
            user: { login: 'github-actions[bot]', type: 'Bot' },
          },
        ]);
      }

      assert.equal(options.method, 'PATCH');
      assert.equal(url, 'https://api.github.com/repos/axios/bundle-size/issues/comments/99');
      assert.deepEqual(JSON.parse(options.body), { body: 'new body' });
      return jsonResponse(200, { id: 99, body: 'new body' });
    };

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });

    assert.deepEqual(
      requests.map((request) => request.options.method),
      ['GET', 'GET', 'PATCH'],
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment creates a comment when no marked comment exists', async () => {
  const originalFetch = global.fetch;
  const requests = [];

  try {
    global.fetch = async (url, options) => {
      requests.push({ url, options });

      if (options.method === 'GET') {
        return jsonResponse(200, [{ id: 1, body: 'different comment' }]);
      }

      assert.equal(options.method, 'POST');
      assert.equal(url, 'https://api.github.com/repos/axios/bundle-size/issues/42/comments');
      assert.deepEqual(JSON.parse(options.body), { body: 'new body' });
      return jsonResponse(201, { id: 13, body: 'new body' });
    };

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });

    assert.equal(requests.length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment skips API calls outside pull request events', async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => {
      throw new Error('fetch should not be called');
    };

    await withGithubEnvironment({ ref: 'refs/heads/main' }, async () => {
      await upsertPullRequestComment('token-value', 'new body');
    });
  } finally {
    global.fetch = originalFetch;
  }
});

function captureStdout(callback) {
  const originalWrite = process.stdout.write.bind(process.stdout);
  const chunks = [];
  process.stdout.write = (chunk, encoding, done) => {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
    if (typeof done === 'function') done();
    return true;
  };
  return Promise.resolve(callback())
    .then(() => chunks.join(''))
    .finally(() => {
      process.stdout.write = originalWrite;
    });
}

test('upsertPullRequestComment warns and continues when the token cannot comment (fork PR)', async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => jsonResponse(403, { message: 'Resource not accessible by integration' });

    const output = await withGithubEnvironment({ number: 42, pull_request: {} }, async () =>
      captureStdout(async () => {
        await upsertPullRequestComment('token-value', 'new body');
      }),
    );

    assert.match(output, /::warning::Skipping bundle size PR comment/);
    assert.match(output, /permission to write pull request or issue comments/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('upsertPullRequestComment rethrows non-permission GitHub API errors', async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => jsonResponse(500, { message: 'Server error' });

    await withGithubEnvironment({ number: 42, pull_request: {} }, async () => {
      await assert.rejects(
        upsertPullRequestComment('token-value', 'new body'),
        /GitHub comments API request failed \(500/,
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});
