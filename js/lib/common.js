/* global jQuery, chrome */
var common = common || {};

(function( $, c ) {

    c.l = function( msg ) {

        if ( window.console && console.log ) {

            console.log( msg );
        }
    };

    c.redirect = function( opt ) {

        opt = opt || {};

        if ( !opt.url ) {

            return;
        }

        chrome.tabs.query({
            url: opt.url
        }, function( tabs ) {

            var removeIds = [];

            if ( !tabs.length ) {

                chrome.tabs.create({
                    url: opt.url
                });
            } else {

                chrome.tabs.update( tabs[0].id, {
                    active: true,
                    url: opt.url1
                }, function() {

                });
            }
        });
    };

    c.saveSettings = function( obj ) {

        var dfd = $.Deferred();

        chrome.storage.local.set({
            settings: obj
        }, function() {

            dfd.resolve();
        });

        return dfd.promise();
    };

    c.loadSettings = function() {

        var dfd = $.Deferred();

        chrome.storage.local.get({
            settings: null
        }, function( items ) {

            dfd.resolve( items.settings || {});
        });

        return dfd.promise();
    };

    c.save = function( saveObj ) {

        var dfd = $.Deferred();

        chrome.storage.local.set( saveObj, function() {

            dfd.resolve();
        });

        return dfd.promise();
    };

    c.load = function( loadObj ) {

        var dfd = $.Deferred();

        chrome.storage.local.get( loadObj, function( loaded ) {

            dfd.resolve( loaded || {});
        });

        return dfd.promise();
    };
})( jQuery, common );
