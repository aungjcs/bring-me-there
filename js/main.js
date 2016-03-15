/* global chrome, jQuery, window, angular, config */
(function( $, undefined ) {

    var app, _injector, _auth;
    var manifest = chrome.runtime.getManifest();
    var VERSION = manifest.version;
    var VERSION_STR = VERSION.replace( /\./ig, '' );
    var github = config.auth.github;

    app = angular.module( 'dighubApp', []);

    app.controller( 'MainController', ['$scope', '$injector', function( $scope, $injector ) {

        var promise, $q;

        _injector = $injector;
        $q = $injector.get( '$q' );

        $scope.user = null;
        $scope.userRepos = [];

        promise = userInfo( _auth ).then(function( result ) {

            $scope.user = result.data;
        });

        $q.when( promise, function() {

            // ユーザー情報取得後にリポジトリ一覧を取得
            userRepos( _auth ).then(function( result ) {

                $scope.userRepos = result && result.data || [];

                console.log( 'repos', $scope.userRepos );
            });
        });
    }]);

    angular.element( document ).ready(function() {

        chrome.storage.local.get({
            auth: null
        }, function( result ) {

            _auth = result.auth;
            angular.bootstrap( document, ['dighubApp']);
        });
    });

    function userInfo( params ) {

        var $http = _injector.get( '$http' );

        return $http.get( 'https://api.github.com/user?access_token=' + params.access_token ).catch( httpErrHandler );
    }

    function userRepos( params ) {

        var $http = _injector.get( '$http' );

        return $http.get( 'https://api.github.com/user/repos?access_token=' + params.access_token ).catch( httpErrHandler );
    }

    function httpErrHandler( err ) {

        console.log( 'http err', err );
    }

})( jQuery );
