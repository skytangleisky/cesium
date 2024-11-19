import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

/**
 * @typedef {Object} GeometryOptions
 * @property {boolean} includeLines
 * @property {number} chordTol
 * @property {number} angleTol
 * @property {number} decimationTol
 * @property {number} maxEdgeLength
 * @property {number} minBRepFeatureSize
 * @property {number} minLineStyleComponentSize
 */

/**
 * @typedef {Object} ViewDefinitionFilter
 * @property {string[]} models Array of included model IDs.
 * @property {string[]} categories Array of included category IDs.
 * @property {string[]} neverDrawn Array of element IDs to filter out.
 */

/**
 * @typedef {Object} StartExport
 * @property {string} iModelId
 * @property {string} changesetId
 * @property {ITwinPlatform.ExportType} exportType Type of mesh to create. Currently, only GLTF and 3DFT are supported and undocumented CESIUM option
 * @property {GeometryOptions} geometryOptions
 * @property {ViewDefinitionFilter} viewDefinitionFilter
 */

/**
 * @typedef {Object} Link
 * @property {string} href
 */

/**
 * @typedef {Object} Export
 * @property {string} id
 * @property {string} displayName
 * @property {ITwinPlatform.ExportStatus} status
 * @property {StartExport} request
 * @property {{mesh: Link}} _links
 */

/**
 * @typedef {Object} ExportResponse
 * @property {Export} export
 */

/**
 * Default settings for accessing the iTwin platform.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see ITwinData for ways to import data
 * @namespace ITwinPlatform
 */
const ITwinPlatform = {};

/**
 * Status states for a mesh-export export
 * @enum {string}
 */
ITwinPlatform.ExportStatus = Object.freeze({
  NotStarted: "NotStarted",
  InProgress: "InProgress",
  Complete: "Complete",
  Invalid: "Invalid",
});

/**
 * Types of mesh-export exports. CesiumJS only supports loading <code>3DTILES</code> type exports
 * @enum {string}
 */
ITwinPlatform.ExportType = Object.freeze({
  IMODEL: "IMODEL",
  CESIUM: "CESIUM",
  "3DTILES": "3DTILES",
});

/**
 * Gets or sets the default iTwin access token. This token should have the <code>itwin-platform</code> scope.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|undefined}
 */
ITwinPlatform.defaultAccessToken = undefined;

/**
 * Gets or sets the default iTwin API endpoint.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @type {string|Resource}
 * @default https://api.bentley.com
 */
ITwinPlatform.apiEndpoint = new Resource({
  url: "https://api.bentley.com",
});

/**
 * Get the export object for the specified export id
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} exportId
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Requested export is not available
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 * TODO: remove? this is used when we're looping to wait for jobs to finish
 */
ITwinPlatform.getExport = async function (exportId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("exportId", exportId);
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const headers = {
    Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
  };

  // obtain export for specified export id
  const url = `${ITwinPlatform.apiEndpoint}mesh-export/${exportId}`;

  // TODO: this request is _really_ slow, like 7 whole second alone for me
  // Arun said this was kinda normal but to keep track of the `x-correlation-id` of any that take EXTRA long
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 404) {
      throw new RuntimeError(`Requested export is not available ${exportId}`);
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {ExportResponse} */
  const result = await response.json();
  return result;
};

/**
 * Get the list of exports for the specified iModel at it's most current version. This will only return exports with {@link ITwinPlatform.ExportType} of <code>3DTILES</code>.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {string} iModelId iModel id
 *
 * @throws {RuntimeError} Unauthorized, bad token, wrong scopes or headers bad.
 * @throws {RuntimeError} Not allowed, forbidden
 * @throws {RuntimeError} Unprocessable Entity
 * @throws {RuntimeError} Too many requests
 * @throws {RuntimeError} Unknown request failure
 * @returns {Promise<{exports: Export[]}>}
 */
ITwinPlatform.getExports = async function (iModelId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const headers = {
    Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
    Accept: "application/vnd.bentley.itwin-platform.v1+json",
    Prefer: "return=representation", // or return=minimal (the default)
  };

  // obtain export for specified export id
  const url = new URL(`${ITwinPlatform.apiEndpoint}mesh-export`);
  url.searchParams.set("iModelId", iModelId);
  url.searchParams.set("exportType", ITwinPlatform.ExportType["3DTILES"]);
  url.searchParams.set("$top", "1");
  url.searchParams.set("client", "CesiumJS");
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    url.searchParams.set("clientVersion", CESIUM_VERSION);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      throw new RuntimeError(
        `Unauthorized, bad token, wrong scopes or headers bad. ${result.error.details[0].code}`,
      );
    } else if (response.status === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (response.status === 422) {
      throw new RuntimeError(
        `Unprocessable Entity:${result.error.code} ${result.error.message}`,
      );
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }
    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {{exports: Export[]}} */
  const result = await response.json();
  return result;
};

/**
 * TODO: REMOVE THIS FUNCTION! Auto generation of exports for the 3DTILES type is planned very soon
 * and will be the desired way of interacting with iModels through exports. This function is here
 * just while we continue testing during the PR process.
 * @deprecated
 */
ITwinPlatform.createExportForModelId = async function (iModelId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("iModelId", iModelId);
  if (!defined(ITwinPlatform.defaultAccessToken)) {
    throw new DeveloperError("Must set ITwin.defaultAccessToken first");
  }
  //>>includeEnd('debug')

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ITwinPlatform.defaultAccessToken}`,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iModelId,
      exportType: ITwinPlatform.ExportType["3DTILES"],
    }),
  };

  // initiate mesh export
  const response = await fetch(
    `${ITwinPlatform.apiEndpoint}mesh-export/`,
    requestOptions,
  );

  if (!response.ok) {
    const result = await response.json();
    if (response.status === 401) {
      console.error(
        result.error.code,
        result.error.message,
        result.error.details,
      );
      throw new RuntimeError(
        "Unauthorized, bad token, wrong scopes or headers bad",
      );
    } else if (response.status === 403) {
      console.error(result.error.code, result.error.message);
      throw new RuntimeError("Not allowed, forbidden");
    } else if (response.status === 422) {
      console.error(result.error.code, result.error.message);
      console.error(result.error.details);
      throw new RuntimeError("Unprocessable: Cannot create export job");
    } else if (response.status === 429) {
      throw new RuntimeError("Too many requests");
    }

    throw new RuntimeError(`Unknown request failure ${response.status}`);
  }

  /** @type {ExportResponse} */
  const result = await response.json();
  return result.export.id;
};

export default ITwinPlatform;
