/* global saveAs */

var bg;
var app;
var connections = [];
var $ = angular.element;
// get bg
chrome.runtime.getBackgroundPage(function( bgWindow ) {

    bg = bgWindow;

    connections = bg.connections;

    angular.element(function( event ) {

        main();
    });
});

function main() {

    app = angular.module( 'extApp', [
        'ngAnimate',
        'ui.bootstrap',
        'mgcrea.ngStrap'
    ]);

    app.run(['$rootScope', function( $rootScope ) {

        chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

            var type = request.type || '';
            var data = request.data || {};

            $rootScope.$broadcast( 'app:' + type, data );
        });
    }]);

    app.controller( 'BodyCtrl', ['$scope', '$injector', '$element', function( $scope, $injector, $element ) {

        var $rootScope = $injector.get( '$rootScope' );

        $scope.$on( 'app:jobs_state_changed', function() {

            $scope.view.connections = bg.getConnections();

            $scope.$applyAsync();
        } );

        $scope.view = {
            connections: connections
        };

        $scope.log = function( $event, c ) {

            $event.preventDefault();

            console.log( 'c', c );
        };
    }]);

    app.filter( 'search', [function() {

        return function( id, item, key, val ) {

            console.log( 'f', arguments );

            // return item[key] === val;
            return true;

            // return records.filter(function( v, i ) {
            //     return v[key] === val;
            // });
        };
    }]);

    angular.bootstrap( document, ['extApp']);
}

