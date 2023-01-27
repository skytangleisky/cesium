import buildModuleUrl from "../Core/buildModuleUrl.js";
import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import Event from "../Core/Event.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TileProviderError from "../Core/TileProviderError.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import BingMapsStyle from "./BingMapsStyle.js";
import DiscardEmptyTilePolicy from "./DiscardEmptyTileImagePolicy.js";
import ImageryProvider from "./ImageryProvider.js";

/**
 * @typedef {Object} BingMapsImageryProvider.ConstructorOptions
 *
 * Initialization options for the BingMapsImageryProvider constructor
 *
 * @property {Resource|String} [url] The url of the Bing Maps server hosting the imagery. Deprecated.
 * @property {String} [key] The Bing Maps key for your application, which can be
 *        created at {@link https://www.bingmapsportal.com/}. Deprecated.
 * @property {String} [tileProtocol] The protocol to use when loading tiles, e.g. 'http' or 'https'.
 *        By default, tiles are loaded using the same protocol as the page.
 * @property {BingMapsStyle} [mapStyle=BingMapsStyle.AERIAL] The type of Bing Maps imagery to load.
 * @property {String} [culture=''] The culture to use when requesting Bing Maps imagery. Not
 *        all cultures are supported. See {@link http://msdn.microsoft.com/en-us/library/hh441729.aspx}
 *        for information on the supported cultures.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {TileDiscardPolicy} [tileDiscardPolicy] The policy that determines if a tile
 *        is invalid and should be discarded.  By default, a {@link DiscardEmptyTileImagePolicy}
 *        will be used, with the expectation that the Bing Maps server will send a zero-length response for missing tiles.
 *        To ensure that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this parameter.
 */

/**
 * <div class="notice">
 * To construct a BingMapsImageryProvider, call {@link BingMapsImageryProvider.fromUrl}. Do not call the constructor directly.
 * </div>
 *
 * Provides tiled imagery using the Bing Maps Imagery REST API.
 *
 * @alias BingMapsImageryProvider
 * @constructor
 *
 * @param {BingMapsImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @see BingMapsImageryProvider.fromUrl
 * @see ArcGisMapServerImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 * @see UrlTemplateImageryProvider
 *
 * @example
 * const bing = await Cesium.BingMapsImageryProvider.fromUrl(
 *   "https://dev.virtualearth.net",
 *   "get-yours-at-https://www.bingmapsportal.com/", {
 *     mapStyle: Cesium.BingMapsStyle.AERIAL
 * });
 *
 * @see {@link http://msdn.microsoft.com/en-us/library/ff701713.aspx|Bing Maps REST Services}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 */
function BingMapsImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The default alpha blending value of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultAlpha = undefined;

  /**
   * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultNightAlpha = undefined;

  /**
   * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultDayAlpha = undefined;

  /**
   * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
   * makes the imagery darker while greater than 1.0 makes it brighter.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultBrightness = undefined;

  /**
   * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
   * the contrast while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultContrast = undefined;

  /**
   * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultHue = undefined;

  /**
   * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.defaultSaturation = undefined;

  /**
   * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
   *
   * @type {Number|undefined}
   * @default 1.0
   */
  this.defaultGamma = 1.0;

  /**
   * The default texture minification filter to apply to this provider.
   *
   * @type {TextureMinificationFilter}
   * @default undefined
   */
  this.defaultMinificationFilter = undefined;

  /**
   * The default texture magnification filter to apply to this provider.
   *
   * @type {TextureMagnificationFilter}
   * @default undefined
   */
  this.defaultMagnificationFilter = undefined;

  this._mapStyle = defaultValue(options.mapStyle, BingMapsStyle.AERIAL);
  this._culture = defaultValue(options.culture, "");
  this._key = options.key;

  this._tileDiscardPolicy = options.tileDiscardPolicy;
  if (!defined(this._tileDiscardPolicy)) {
    this._tileDiscardPolicy = new DiscardEmptyTilePolicy();
  }

  this._proxy = options.proxy;
  this._credit = new Credit(
    `<a href="http://www.bing.com"><img src="${BingMapsImageryProvider.logoUrl}" title="Bing Imagery"/></a>`
  );

  this._tilingScheme = new WebMercatorTilingScheme({
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 2,
    ellipsoid: options.ellipsoid,
  });

  this._tileWidth = undefined;
  this._tileHeight = undefined;
  this._maximumLevel = undefined;
  this._imageUrlTemplate = undefined;
  this._imageUrlSubdomains = undefined;

  this._errorEvent = new Event();

  this._ready = false;
  if (defined(options.url)) {
    deprecationWarning(
      "BingMapsImageryProvider options.url",
      "options.url was deprecated in CesiumJS 1.102.  It will be removed in 1.104.  Use BingMapsImageryProvider.fromUrl instead."
    );

    //>>includeStart('debug', pragmas.debug);
    Check.defined("options.key", options.key);
    //>>includeEnd('debug');

    let tileProtocol = options.tileProtocol;

    // For backward compatibility reasons, the tileProtocol may end with
    // a `:`. Remove it.
    if (defined(tileProtocol)) {
      if (
        tileProtocol.length > 0 &&
        tileProtocol[tileProtocol.length - 1] === ":"
      ) {
        tileProtocol = tileProtocol.substr(0, tileProtocol.length - 1);
      }
    } else {
      // use http if the document's protocol is http, otherwise use https
      const documentProtocol = document.location.protocol;
      tileProtocol = documentProtocol === "http:" ? "http" : "https";
    }

    const resource = Resource.createIfNeeded(options.url);
    this._resource = resource;
    resource.appendForwardSlash();
    const metadataResource = resource.getDerivedResource({
      url: `REST/v1/Imagery/Metadata/${this._mapStyle}`,
      queryParameters: {
        incl: "ImageryProviders",
        key: options.key,
        uriScheme: tileProtocol,
      },
    });

    const imageryProviderBuilder = new ImageryProviderBuilder(options);
    this._readyPromise = requestMetadata(
      metadataResource,
      imageryProviderBuilder,
      this
    ).then(() => {
      imageryProviderBuilder.build(this);
      return true;
    });
  } else {
    this._readyPromise = Promise.resolve(true);
  }
}

Object.defineProperties(BingMapsImageryProvider.prototype, {
  /**
   * Gets the name of the BingMaps server url hosting the imagery.
   * @memberof BingMapsImageryProvider.prototype
   * @type {String}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource.url;
    },
  },

  /**
   * Gets the proxy used by this provider.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Proxy}
   * @readonly
   */
  proxy: {
    get: function () {
      return this._resource.proxy;
    },
  },

  /**
   * Gets the Bing Maps key.
   * @memberof BingMapsImageryProvider.prototype
   * @type {String}
   * @readonly
   */
  key: {
    get: function () {
      return this._key;
    },
  },

  /**
   * Gets the type of Bing Maps imagery to load.
   * @memberof BingMapsImageryProvider.prototype
   * @type {BingMapsStyle}
   * @readonly
   */
  mapStyle: {
    get: function () {
      return this._mapStyle;
    },
  },

  /**
   * The culture to use when requesting Bing Maps imagery. Not
   * all cultures are supported. See {@link http://msdn.microsoft.com/en-us/library/hh441729.aspx}
   * for information on the supported cultures.
   * @memberof BingMapsImageryProvider.prototype
   * @type {String}
   * @readonly
   */
  culture: {
    get: function () {
      return this._culture;
    },
  },

  /**
   * Gets the width of each tile, in pixels.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileWidth: {
    get: function () {
      return this._tileWidth;
    },
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  tileHeight: {
    get: function () {
      return this._tileHeight;
    },
  },

  /**
   * Gets the maximum level-of-detail that can be requested.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Number|undefined}
   * @readonly
   */
  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    },
  },

  /**
   * Gets the minimum level-of-detail that can be requested.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Number}
   * @readonly
   */
  minimumLevel: {
    get: function () {
      return 0;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof BingMapsImageryProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets the rectangle, in radians, of the imagery provided by this instance.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Rectangle}
   * @readonly
   */
  rectangle: {
    get: function () {
      return this._tilingScheme.rectangle;
    },
  },

  /**
   * Gets the tile discard policy.  If not undefined, the discard policy is responsible
   * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
   * returns undefined, no tiles are filtered.
   * @memberof BingMapsImageryProvider.prototype
   * @type {TileDiscardPolicy}
   * @readonly
   */
  tileDiscardPolicy: {
    get: function () {
      return this._tileDiscardPolicy;
    },
  },

  /**
   * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "BingMapsImageryProvider.ready",
        "BingMapsImageryProvider.ready was deprecated in CesiumJS 1.102.  It will be removed in 1.104.  Use BingMapsImageryProvider.fromUrl instead."
      );
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "BingMapsImageryProvider.readyPromise",
        "BingMapsImageryProvider.readyPromise was deprecated in CesiumJS 1.102.  It will be removed in 1.104.  Use BingMapsImageryProvider.fromUrl instead."
      );
      return this._readyPromise;
    },
  },

  /**
   * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
   * the source of the imagery.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets a value indicating whether or not the images provided by this imagery provider
   * include an alpha channel.  If this property is false, an alpha channel, if present, will
   * be ignored.  If this property is true, any images without an alpha channel will be treated
   * as if their alpha is 1.0 everywhere.  Setting this property to false reduces memory usage
   * and texture upload time.
   * @memberof BingMapsImageryProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasAlphaChannel: {
    get: function () {
      return false;
    },
  },
});

/**
 * Used to track creation details while fetching initial metadata
 *
 * @constructor
 * @private
 *
 * @param {BingMapsImageryProvider.ConstructorOptions} options An object describing initialization options
 */
function ImageryProviderBuilder(options) {
  this.tileWidth = undefined;
  this.tileHeight = undefined;
  this.maximumLevel = undefined;
  this.imageUrlSubdomains = undefined;
  this.imageUrlTemplate = undefined;

  this.attributionList = undefined;
}

/**
 * Complete BingMapsImageryProvider creation based on builder values.
 *
 * @private
 *
 * @param {BingMapsImageryProvider} provider
 */
ImageryProviderBuilder.prototype.build = function (provider) {
  provider._tileWidth = this.tileWidth;
  provider._tileHeight = this.tileHeight;
  provider._maximumLevel = this.maximumLevel;
  provider._imageUrlSubdomains = this.imageUrlSubdomains;
  provider._imageUrlTemplate = this.imageUrlTemplate;

  let attributionList = (provider._attributionList = this.attributionList);
  if (!attributionList) {
    attributionList = [];
  }
  provider._attributionList = attributionList;

  for (
    let attributionIndex = 0, attributionLength = attributionList.length;
    attributionIndex < attributionLength;
    ++attributionIndex
  ) {
    const attribution = attributionList[attributionIndex];

    if (attribution.credit instanceof Credit) {
      // If attribution.credit has already been created
      // then we are using a cached value, which means
      // none of the remaining processing needs to be done.
      break;
    }

    attribution.credit = new Credit(attribution.attribution);
    const coverageAreas = attribution.coverageAreas;

    for (
      let areaIndex = 0, areaLength = attribution.coverageAreas.length;
      areaIndex < areaLength;
      ++areaIndex
    ) {
      const area = coverageAreas[areaIndex];
      const bbox = area.bbox;
      area.bbox = new Rectangle(
        CesiumMath.toRadians(bbox[1]),
        CesiumMath.toRadians(bbox[0]),
        CesiumMath.toRadians(bbox[3]),
        CesiumMath.toRadians(bbox[2])
      );
    }
  }

  provider._ready = true;
};

function metadataSuccess(data, imageryProviderBuilder) {
  if (data.resourceSets.length !== 1) {
    throw new RuntimeError(
      "metadata does not specify one resource in resourceSets"
    );
  }

  const resource = data.resourceSets[0].resources[0];
  imageryProviderBuilder.tileWidth = resource.imageWidth;
  imageryProviderBuilder.tileHeight = resource.imageHeight;
  imageryProviderBuilder.maximumLevel = resource.zoomMax - 1;
  imageryProviderBuilder.imageUrlSubdomains = resource.imageUrlSubdomains;
  imageryProviderBuilder.imageUrlTemplate = resource.imageUrl;
  imageryProviderBuilder.attributionList = resource.imageryProviders;
}

function metadataFailure(metadataResource, error, provider) {
  let message = `An error occurred while accessing ${metadataResource.url}`;
  if (defined(error) && defined(error.message)) {
    message += `: ${error.message}`;
  }

  TileProviderError.reportError(
    undefined,
    provider,
    defined(provider) ? provider._errorEvent : undefined,
    message,
    undefined,
    undefined,
    undefined,
    error
  );

  throw new RuntimeError(message);
}

async function requestMetadata(
  metadataResource,
  imageryProviderBuilder,
  provider
) {
  const cacheKey = metadataResource.url;
  let promise = BingMapsImageryProvider._metadataCache[cacheKey];
  if (!defined(promise)) {
    promise = metadataResource.fetchJsonp("jsonp");
    BingMapsImageryProvider._metadataCache[cacheKey] = promise;
  }

  try {
    const data = await promise;
    return metadataSuccess(data, imageryProviderBuilder);
  } catch (e) {
    metadataFailure(metadataResource, e, provider);
  }
}

/**
 * Creates an {@link ImageryProvider} which provides tiled imagery using the Bing Maps Imagery REST API.
 *
 * @param {Resource|String} url The url of the Bing Maps server hosting the imagery.
 * @param {String} key The Bing Maps key for your application, which can be
 *        created at {@link https://www.bingmapsportal.com/}.
 * @param {BingMapsImageryProvider.ConstructorOptions} options Object describing initialization options
 * @returns {Promise<BingMapsImageryProvider>} A promise that resolves to the created BingMapsImageryProvider
 *
 * @example
 * const bing = await Cesium.BingMapsImageryProvider.fromUrl(
 *   "https://dev.virtualearth.net",
 *   "get-yours-at-https://www.bingmapsportal.com/", {
 *     mapStyle: Cesium.BingMapsStyle.AERIAL
 * });
 *
 * @exception {RuntimeError} metadata does not specify one resource in resourceSets
 */
BingMapsImageryProvider.fromUrl = async function (url, key, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  Check.defined("key", key);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  let tileProtocol = options.tileProtocol;

  // For backward compatibility reasons, the tileProtocol may end with
  // a `:`. Remove it.
  if (defined(tileProtocol)) {
    if (
      tileProtocol.length > 0 &&
      tileProtocol[tileProtocol.length - 1] === ":"
    ) {
      tileProtocol = tileProtocol.substr(0, tileProtocol.length - 1);
    }
  } else {
    // use http if the document's protocol is http, otherwise use https
    const documentProtocol = document.location.protocol;
    tileProtocol = documentProtocol === "http:" ? "http" : "https";
  }

  const mapStyle = defaultValue(options.mapStyle, BingMapsStyle.AERIAL);
  const resource = Resource.createIfNeeded(url);
  resource.appendForwardSlash();
  const metadataResource = resource.getDerivedResource({
    url: `REST/v1/Imagery/Metadata/${mapStyle}`,
    queryParameters: {
      incl: "ImageryProviders",
      key: key,
      uriScheme: tileProtocol,
    },
  });

  const provider = new BingMapsImageryProvider(options);
  provider._resource = resource;
  provider._key = key;
  const imageryProviderBuilder = new ImageryProviderBuilder(options);
  await requestMetadata(metadataResource, imageryProviderBuilder);
  imageryProviderBuilder.build(provider);
  return provider;
};

const rectangleScratch = new Rectangle();

/**
 * Gets the credits to be displayed when a given tile is displayed.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level;
 * @returns {Credit[]} The credits to be displayed when the tile is displayed.
 */
BingMapsImageryProvider.prototype.getTileCredits = function (x, y, level) {
  const rectangle = this._tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    rectangleScratch
  );
  const result = getRectangleAttribution(
    this._attributionList,
    level,
    rectangle
  );

  return result;
};

/**
 * Requests the image for a given tile.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<ImageryTypes>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request should be retried later.
 */
BingMapsImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  const promise = ImageryProvider.loadImage(
    this,
    buildImageResource(this, x, y, level, request)
  );

  if (defined(promise)) {
    return promise.catch(function (error) {
      // One cause of an error here is that the image we tried to load was zero-length.
      // This isn't actually a problem, since it indicates that there is no tile.
      // So, in that case we return the EMPTY_IMAGE sentinel value for later discarding.
      if (defined(error.blob) && error.blob.size === 0) {
        return DiscardEmptyTilePolicy.EMPTY_IMAGE;
      }
      return Promise.reject(error);
    });
  }

  return undefined;
};

/**
 * Picking features is not currently supported by this imagery provider, so this function simply returns
 * undefined.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Number} longitude The longitude at which to pick features.
 * @param {Number} latitude  The latitude at which to pick features.
 * @return {undefined} Undefined since picking is not supported.
 */
BingMapsImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  return undefined;
};

/**
 * Converts a tiles (x, y, level) position into a quadkey used to request an image
 * from a Bing Maps server.
 *
 * @param {Number} x The tile's x coordinate.
 * @param {Number} y The tile's y coordinate.
 * @param {Number} level The tile's zoom level.
 *
 * @see {@link http://msdn.microsoft.com/en-us/library/bb259689.aspx|Bing Maps Tile System}
 * @see BingMapsImageryProvider#quadKeyToTileXY
 */
BingMapsImageryProvider.tileXYToQuadKey = function (x, y, level) {
  let quadkey = "";
  for (let i = level; i >= 0; --i) {
    const bitmask = 1 << i;
    let digit = 0;

    if ((x & bitmask) !== 0) {
      digit |= 1;
    }

    if ((y & bitmask) !== 0) {
      digit |= 2;
    }

    quadkey += digit;
  }
  return quadkey;
};

/**
 * Converts a tile's quadkey used to request an image from a Bing Maps server into the
 * (x, y, level) position.
 *
 * @param {String} quadkey The tile's quad key
 *
 * @see {@link http://msdn.microsoft.com/en-us/library/bb259689.aspx|Bing Maps Tile System}
 * @see BingMapsImageryProvider#tileXYToQuadKey
 */
BingMapsImageryProvider.quadKeyToTileXY = function (quadkey) {
  let x = 0;
  let y = 0;
  const level = quadkey.length - 1;
  for (let i = level; i >= 0; --i) {
    const bitmask = 1 << i;
    const digit = +quadkey[level - i];

    if ((digit & 1) !== 0) {
      x |= bitmask;
    }

    if ((digit & 2) !== 0) {
      y |= bitmask;
    }
  }
  return {
    x: x,
    y: y,
    level: level,
  };
};

BingMapsImageryProvider._logoUrl = undefined;

Object.defineProperties(BingMapsImageryProvider, {
  /**
   * Gets or sets the URL to the Bing logo for display in the credit.
   * @memberof BingMapsImageryProvider
   * @type {String}
   */
  logoUrl: {
    get: function () {
      if (!defined(BingMapsImageryProvider._logoUrl)) {
        BingMapsImageryProvider._logoUrl = buildModuleUrl(
          "Assets/Images/bing_maps_credit.png"
        );
      }
      return BingMapsImageryProvider._logoUrl;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("value", value);
      //>>includeEnd('debug');

      BingMapsImageryProvider._logoUrl = value;
    },
  },
});

function buildImageResource(imageryProvider, x, y, level, request) {
  const imageUrl = imageryProvider._imageUrlTemplate;

  const subdomains = imageryProvider._imageUrlSubdomains;
  const subdomainIndex = (x + y + level) % subdomains.length;

  return imageryProvider._resource.getDerivedResource({
    url: imageUrl,
    request: request,
    templateValues: {
      quadkey: BingMapsImageryProvider.tileXYToQuadKey(x, y, level),
      subdomain: subdomains[subdomainIndex],
      culture: imageryProvider._culture,
    },
    queryParameters: {
      // this parameter tells the Bing servers to send a zero-length response
      // instead of a placeholder image for missing tiles.
      n: "z",
    },
  });
}

const intersectionScratch = new Rectangle();

function getRectangleAttribution(attributionList, level, rectangle) {
  // Bing levels start at 1, while ours start at 0.
  ++level;

  const result = [];

  for (
    let attributionIndex = 0, attributionLength = attributionList.length;
    attributionIndex < attributionLength;
    ++attributionIndex
  ) {
    const attribution = attributionList[attributionIndex];
    const coverageAreas = attribution.coverageAreas;

    let included = false;

    for (
      let areaIndex = 0, areaLength = attribution.coverageAreas.length;
      !included && areaIndex < areaLength;
      ++areaIndex
    ) {
      const area = coverageAreas[areaIndex];
      if (level >= area.zoomMin && level <= area.zoomMax) {
        const intersection = Rectangle.intersection(
          rectangle,
          area.bbox,
          intersectionScratch
        );
        if (defined(intersection)) {
          included = true;
        }
      }
    }

    if (included) {
      result.push(attribution.credit);
    }
  }

  return result;
}

// Exposed for testing
BingMapsImageryProvider._metadataCache = {};
export default BingMapsImageryProvider;
