import type { NpmReleaseBaseline } from "@/types";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";
const PREVIOUS_RELEASE_LIMIT = 10;

interface NpmVersionMetadata {
  dist?: {
    tarball?: unknown;
  };
}

interface NpmPackageMetadata {
  "dist-tags"?: {
    latest?: unknown;
  };
  versions?: Record<string, NpmVersionMetadata>;
  time?: Record<string, string>;
}

export function getNpmPackageMetadataUrl(packageName: string): string {
  return `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`;
}

function isStableVersion(version: string): boolean {
  return !version.includes("-");
}

function getTarballUri(
  packageName: string,
  version: string,
  metadata: NpmPackageMetadata,
): string {
  const tarball = metadata.versions?.[version]?.dist?.tarball;

  if (typeof tarball !== "string" || !tarball.trim()) {
    throw new Error(`Npm package ${packageName} version ${version} is missing a tarball URL.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(tarball);
  } catch {
    throw new Error(`Npm package ${packageName} version ${version} has an invalid tarball URL.`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Npm package ${packageName} version ${version} has an unsupported tarball URL protocol: ${parsed.protocol}`,
    );
  }

  return tarball;
}

function getPublishedTime(
  packageName: string,
  version: string,
  metadata: NpmPackageMetadata,
): number {
  const publishedAt = metadata.time?.[version];
  const timestamp = publishedAt ? Date.parse(publishedAt) : Number.NaN;

  if (Number.isNaN(timestamp)) {
    throw new Error(`Npm package ${packageName} version ${version} is missing publish time metadata.`);
  }

  return timestamp;
}

export function selectNpmReleaseBaselines(
  packageName: string,
  metadata: NpmPackageMetadata,
): NpmReleaseBaseline[] {
  const latestVersion = metadata["dist-tags"]?.latest;

  if (
    typeof latestVersion !== "string" ||
    !latestVersion ||
    !metadata.versions?.[latestVersion]
  ) {
    throw new Error(`Npm package ${packageName} does not define a usable latest release.`);
  }

  const latestPublishedAt = getPublishedTime(packageName, latestVersion, metadata);
  const previousVersions = Object.keys(metadata.versions)
    .filter((version) => version !== latestVersion && isStableVersion(version))
    .map((version) => ({
      version,
      publishedAt: getPublishedTime(packageName, version, metadata),
    }))
    .filter((release) => release.publishedAt < latestPublishedAt)
    .sort((left, right) => right.publishedAt - left.publishedAt)
    .slice(0, PREVIOUS_RELEASE_LIMIT)
    .map((release) => release.version);

  return [latestVersion, ...previousVersions].map((version, index) => ({
    version,
    uri: getTarballUri(packageName, version, metadata),
    latest: index === 0,
  }));
}

export async function resolveNpmReleaseBaselines(
  packageName: string,
): Promise<NpmReleaseBaseline[]> {
  const metadataUrl = getNpmPackageMetadataUrl(packageName);
  let response: Response;

  try {
    response = await fetch(metadataUrl);
  } catch (error) {
    throw new Error(
      `Failed to fetch npm metadata for ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch npm metadata for ${packageName}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  let metadata: NpmPackageMetadata;
  try {
    metadata = (await response.json()) as NpmPackageMetadata;
  } catch (error) {
    throw new Error(
      `Failed to parse npm metadata for ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return selectNpmReleaseBaselines(packageName, metadata);
}
