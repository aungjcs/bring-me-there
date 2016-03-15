/* global chrome, jQuery, window, angular, config, common */
(function( $, undefined ) {

    var manifest = chrome.runtime.getManifest();
    // var VERSION = manifest.version;

    $(function() {

        console.log( 'bring me there!! i am popup' );
    });

    // angular.module( 'dighubApp', [])
    //     .controller( 'PopupController', ['$scope',
    //         function( $scope ) {

    //             $scope.login = function() {

    //                 var url, state, cbUrl;

    //                 if ( auth && auth.access_token ) {

    //                     common.redirect({

    //                         url: chrome.extension.getURL( 'main.html' )
    //                     });

    //                     return;
    //                 }

    //                 url = 'https://github.com/login/oauth/authorize';
    //                 state = '_' + new Date().getTime() + '_';
    //                 cbUrl = chrome.extension.getURL( 'callback.html' );

    //                 url = url + '?' + [
    //                     'client_id=' + config.auth.github.clientId,
    //                     'redirect_uri=' + encodeURIComponent( config.auth.github.redirectUri ),
    //                     'scope=' + config.auth.github.scope,
    //                     'state=' + state
    //                 ].join( '&' );

    //                 // clear old window
    //                 chrome.tabs.query({
    //                     url: chrome.extension.getURL( 'main.html' ) + '*'
    //                 }, function( tabs ) {

    //                     var removeIds = [];

    //                     if ( tabs.length ) {

    //                         tabs.forEach(function( tab ) {

    //                             removeIds.push( tab.id );
    //                         });
    //                     }

    //                     chrome.tabs.remove( removeIds );
    //                 });

    //                 chrome.tabs.create({
    //                     url: url
    //                 });
    //             };
    //         }
    //     ]);

    // angular.element( document ).ready(function() {

    //     chrome.storage.local.get({
    //         auth: null
    //     }, function( result ) {

    //         auth = result.auth;
    //         angular.bootstrap( document, ['dighubApp']);

    //         $( 'a.auto-ref' ).click(function( evt ) {

    //             evt.preventDefault();

    //             chrome.tabs.create({
    //                 url: this.href
    //             });
    //         });
    //     });

    // });

})( jQuery );
