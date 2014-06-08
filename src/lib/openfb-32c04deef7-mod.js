/**
 * OpenFB is a micro-library that lets you integrate your JavaScript application with Facebook.
 * OpenFB works for both BROWSER-BASED apps and CORDOVA/PHONEGAP apps.
 * This library has no dependency: You don't need (and shouldn't use) the Facebook SDK with this library. Whe running in
 * Cordova, you also don't need the Facebook Cordova plugin. There is also no dependency on jQuery.
 * OpenFB allows you to login to Facebook and execute any Facebook Graph API request.
 * @author Christophe Coenraets @ccoenraets
 * @version 0.3
 */

/* Modified: see https://github.com/ccoenraets/OpenFB/pull/16 */
/* Modified: last line added for Browserify compatibility */

var openFB = (function () {

    var FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth',

    // By default we store fbtoken in sessionStorage. This can be overridden in init()
        tokenStore = window.sessionStorage,

        fbAppId,
        oauthRedirectURL,

    // Because the OAuth login spans multiple processes, we need to keep the success/error handlers as variables
    // inside the module instead of keeping them local within the login function.
        loginSuccessHandler,
        loginErrorHandler,

    // Indicates if the app is running inside Cordova
        runningInCordova,

    // Used in the exit event handler to identify if the login has already been processed elsewhere (in the oauthCallback function)
        loginProcessed;

    document.addEventListener("deviceready", function () {
        runningInCordova = true;
    }, false);

    /**
     * Initialize the OpenFB module. You must use this function and initialize the module with an appId before you can
     * use any other function.
     * @param appId - The id of the Facebook app
     * @param options - Options object. Can include:
     *  redirectURL: The OAuth redirect URL. Optional. If not provided, we use sensible defaults.
     *  store: The store used to save the Facebook token. Optional. If not provided, we use sessionStorage.
     *  accessToken: The Facebook token. Optional.
     */
    function init(appId, options) {
        fbAppId = appId;

        options = options || {};
        if (options.redirectURL) oauthRedirectURL = options.redirectURL;
        if (options.store) tokenStore = options.store;
        if (options.accessToken) tokenStore['fbtoken'] = options.accessToken;
    }

    /**
     * Login to Facebook using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
     * If running in Cordova container, it happens using the In-App Browser. Don't forget to install the In-App Browser
     * plugin in your Cordova project: cordova plugins add org.apache.cordova.inappbrowser.
     * @param scope - The set of Facebook permissions requested
     * @param success - Callback function to invoke when the login process succeeds
     * @param error - Callback function to invoke when the login process fails
     * @returns {*}
     */
    function login(scope, success, error) {

        var loginWindow,
            startTime;

        function loginWindowLoadStart(event) {
            var url = event.url;
            if (url.indexOf("access_token=") > 0 || url.indexOf("error=") > 0) {
                // When we get the access token fast, the login window (inappbrowser) is still opening with animation
                // in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
                var timeout = 600 - (new Date().getTime() - startTime);
                setTimeout(function () {
                    loginWindow.close();
                }, timeout > 0 ? timeout : 0);
                oauthCallback(url);
            }
        }

        function loginWindowExit() {
            console.log('exit and remove listeners');
            // Handle the situation where the user closes the login window manually before completing the login process
            deferredLogin.reject({error: 'user_cancelled', error_description: 'User cancelled login process', error_reason: "user_cancelled"});
            loginWindow.removeEventListener('loadstop', loginWindowLoadStart);
            loginWindow.removeEventListener('exit', loginWindowExit);
            loginWindow = null;
            console.log('done removing listeners');
        }


        if (!fbAppId) {
            return error({error: 'Facebook App Id not set.'});
        }

        scope = scope || '';

        loginSuccessHandler = success;
        loginErrorHandler = error;

        loginProcessed = false;
        logout();

        // Check if an explicit oauthRedirectURL has been provided in init(). If not, infer the appropriate value
        if (!oauthRedirectURL) {
            if (runningInCordova) {
                oauthRedirectURL = 'https://www.facebook.com/connect/login_success.html';
            } else {
                var origin = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
                // could also use 'var origin = window.location.origin' when enough browsers support it
                oauthRedirectURL = origin + '/oauthcallback.html';
            }
        }

        startTime = new Date().getTime();
        loginWindow = window.open(FB_LOGIN_URL + '?client_id=' + fbAppId + '&redirect_uri=' + oauthRedirectURL +
            '&response_type=token&display=popup&scope=' + scope, '_blank', 'location=no');

        // If the app is running in Cordova, listen to URL changes in the InAppBrowser until we get a URL with an access_token or an error
        if (runningInCordova) {
            loginWindow.addEventListener('loadstart', loginWindowLoadStart);
            loginWindow.addEventListener('exit', loginWindowExit);
        }
        // Note: if the app is running in the browser the loginWindow dialog will call back by invoking the
        // oauthCallback() function. See oauthcallback.html for details.

    }

    /**
     * Called either by oauthcallback.html (when the app is running the browser) or by the loginWindow loadstart event
     * handler defined in the login() function (when the app is running in the Cordova/PhoneGap container).
     * @param url - The oautchRedictURL called by Facebook with the access_token in the querystring at the ned of the
     * OAuth workflow.
     */
    function oauthCallback(url) {
        // Parse the OAuth data received from Facebook
        var queryString,
            obj;

        loginProcessed = true;
        if (url.indexOf("access_token=") > 0) {
            queryString = url.substr(url.indexOf('#') + 1);
            obj = parseQueryString(queryString);
            tokenStore['fbtoken'] = obj['access_token'];
            if (loginSuccessHandler) loginSuccessHandler();
        } else if (url.indexOf("error=") > 0) {
            queryString = url.substring(url.indexOf('?') + 1, url.indexOf('#'));
            obj = parseQueryString(queryString);
            if (loginErrorHandler) loginErrorHandler(obj);
        } else {
            if (loginErrorHandler) loginErrorHandler();
        }
    }

    /**
     * Application-level logout: we simply discard the token.
     */
    function logout() {
        tokenStore['fbtoken'] = undefined;
    }

    /**
     * Lets you make any Facebook Graph API request.
     * @param obj - Request configuration object. Can include:
     *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
     *  path:    path in the Facebook graph: /me, /me.friends, etc. - Required
     *  params:  queryString parameters as a map - Optional
     *  success: callback function when operation succeeds - Optional
     *  error:   callback function when operation fails - Optional
     */
    function api(obj) {

        var method = obj.method || 'GET',
            params = obj.params || {},
            xhr = new XMLHttpRequest(),
            url;

        params['access_token'] = tokenStore['fbtoken'];

        url = 'https://graph.facebook.com' + obj.path + '?' + toQueryString(params);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (obj.success) obj.success(JSON.parse(xhr.responseText));
                } else {
                    var error = xhr.responseText ? JSON.parse(xhr.responseText).error : {message: 'An error has occurred'};
                    if (obj.error) obj.error(error);
                }
            }
        };

        xhr.open(method, url, true);
        xhr.send();
    }

    /**
     * Helper function to de-authorize the app
     * @param success
     * @param error
     * @returns {*}
     */
    function revokePermissions(success, error) {
        return api({method: 'DELETE',
            path: '/me/permissions',
            success: function () {
                tokenStore['fbtoken'] = undefined;
                success();
            },
            error: error});
    }

    function parseQueryString(queryString) {
        var qs = decodeURIComponent(queryString),
            obj = {},
            params = qs.split('&');
        params.forEach(function (param) {
            var splitter = param.split('=');
            obj[splitter[0]] = splitter[1];
        });
        return obj;
    }

    function toQueryString(obj) {
        var parts = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }
        return parts.join("&");
    }

    // The public API
    return {
        init: init,
        login: login,
        logout: logout,
        revokePermissions: revokePermissions,
        api: api,
        oauthCallback: oauthCallback
    }

}());

if (module) module.exports = openFB; // mod