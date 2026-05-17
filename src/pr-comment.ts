import * as core from "@actions/core";
import { readFile } from "node:fs/promises";
import { BUNDLE_SIZE_COMMENT_MARKER } from "@/comment";

interface IssueComment {
  id: number;
  body?: string;
  user?: {
    login?: string;
    type?: string;
  };
}

interface PullRequestPayload {
  number?: unknown;
  pull_request?: {
    number?: unknown;
  };
}

interface GitHubApiErrorBody {
  message?: string;
}

interface GitHubPage<T> {
  body: T;
  nextUrl: string | null;
}

class GitHubApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export async function getPullRequestNumberFromEvent(): Promise<number | null> {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath) {
    return null;
  }

  const payload = JSON.parse(
    await readFile(eventPath, "utf8"),
  ) as PullRequestPayload;
  const pullRequestNumber = payload.pull_request?.number ?? payload.number;

  return typeof pullRequestNumber === "number" ? pullRequestNumber : null;
}

function getRepository(): { owner: string; repo: string } {
  const repository = process.env.GITHUB_REPOSITORY;

  if (!repository) {
    throw new Error("GITHUB_REPOSITORY is required to post a pull request comment.");
  }

  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  return { owner, repo };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GitHubApiErrorBody;
    return body.message ? `: ${body.message}` : "";
  } catch {
    return "";
  }
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  for (const link of linkHeader.split(",")) {
    if (!link.includes('rel="next"')) {
      continue;
    }

    const match = /<([^>]+)>/.exec(link);
    return match?.[1] ?? null;
  }

  return null;
}

async function requestGitHubPage<T>(
  token: string,
  method: string,
  url: string,
  body?: unknown,
): Promise<GitHubPage<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "axios-bundle-size-action",
      "x-github-api-version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    const permissionHint =
      response.status === 401 || response.status === 403
        ? " Check that github-token has permission to write pull request or issue comments."
        : "";

    throw new GitHubApiError(
      `GitHub comments API request failed (${response.status} ${response.statusText})${detail}.${permissionHint}`,
      response.status,
    );
  }

  return {
    body: (await response.json()) as T,
    nextUrl: parseNextLink(response.headers.get("link")),
  };
}

async function requestGitHub<T>(
  token: string,
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const page = await requestGitHubPage<T>(token, method, url, body);
  return page.body;
}

function isBundleSizeComment(comment: IssueComment): boolean {
  return comment.body?.includes(BUNDLE_SIZE_COMMENT_MARKER) === true;
}

async function findExistingBundleSizeComment(
  token: string,
  commentsUrl: string,
): Promise<IssueComment | undefined> {
  let nextUrl: string | null = commentsUrl;

  while (nextUrl) {
    const page: GitHubPage<IssueComment[]> = await requestGitHubPage<
      IssueComment[]
    >(
      token,
      "GET",
      nextUrl,
    );
    const existingComment = page.body.find(isBundleSizeComment);

    if (existingComment) {
      return existingComment;
    }

    nextUrl = page.nextUrl;
  }

  return undefined;
}

export async function upsertPullRequestComment(
  token: string,
  body: string,
): Promise<void> {
  const pullRequestNumber = await getPullRequestNumberFromEvent();

  if (pullRequestNumber === null) {
    core.info("Skipping bundle size PR comment because this run is not for a pull request.");
    return;
  }

  const { owner, repo } = getRepository();
  const apiRoot = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const existingComment = await findExistingBundleSizeComment(
      token,
      `${apiRoot}/issues/${pullRequestNumber}/comments?per_page=100`,
    );

    if (existingComment) {
      await requestGitHub<IssueComment>(
        token,
        "PATCH",
        `${apiRoot}/issues/comments/${existingComment.id}`,
        { body },
      );
      core.info("Updated existing bundle size PR comment.");
      return;
    }

    await requestGitHub<IssueComment>(
      token,
      "POST",
      `${apiRoot}/issues/${pullRequestNumber}/comments`,
      { body },
    );
    core.info("Created bundle size PR comment.");
  } catch (error) {
    // Fork pull requests receive a read-only GITHUB_TOKEN regardless of
    // the workflow's requested permissions. Surface that as a warning so
    // the comparison report and outputs still succeed.
    if (
      error instanceof GitHubApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      core.warning(`Skipping bundle size PR comment: ${error.message}`);
      return;
    }
    throw error;
  }
}
