/* global chrome, async, jQuery, window, angular, config, Promise, common */
var Common = {};
(function() {

    var manifest = chrome.runtime.getManifest();

    Promise.config({
        cancellation: true
    });

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

    Common.newId = (function() {

        var ts = ( new Date()).getTime();
        return function() {

            ts = ts + 1;
            return ts;
        };
    })();

    Common.messageToTab = function( tabQuery, msg ) {

        return new Promise(function( resolve ) {

            chrome.tabs.query( tabQuery, function( tabs ) {

                if ( !tabs.length ) {

                    throw 'Tab not found.';
                }

                chrome.tabs.sendMessage( tabs[0].id, msg, function( res ) {

                    resolve( res );
                });
            });
        });
    };

    Common.messageToActiveTab = function( msg ) {

        var tabQuery = {};
        tabQuery.active = true;
        tabQuery.currentWindow = true;

        return Common.messageToTab( tabQuery, msg );
    };

    Common.openTab = function( url ) {

        chrome.tabs.queryAsync({
            url: url
        }).then(function( tabs ) {

            if ( tabs.length ) {

                chrome.tabs.update( tabs[0].id, { active: true });
                return;
            }

            chrome.tabs.create({ url: url });
        });
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
