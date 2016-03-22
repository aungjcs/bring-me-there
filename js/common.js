/* global chrome, async, jQuery, window, angular, config, Promise, common */
var Common = {};
(function() {

    var manifest = chrome.runtime.getManifest();

    [
        chrome.browserAction,
        chrome.runtime,
        chrome.storage.local,
        chrome.storage.sync,
        chrome.tabs
    ].forEach(function( api ) {

        api && Promise.promisifyAll( api, { promisifier: ChromeExtPromisifier });
    });

    Common.l = function( logName ) {

        return function() {

            var args = [].slice.call( arguments );

            args.unshift( logName );

            console.log.apply( console, args );
        };
    };

    function ChromeExtPromisifier( originalMethod ) {

        // return a function
        return function promisified() {

            var args = [].slice.call( arguments );

            // Needed so that the original method can be called with the correct receiver
            var self = this;

            // which returns a promise
            return new Promise(function( resolve, reject ) {

                // args.push( resolve, reject );
                args.push( resolve );
                originalMethod.apply( self, args );
            });
        };
    }
})();
