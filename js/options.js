function main() {

    var app = angular.module( 'extApp', [
        'ui.bootstrap',
        'mgcrea.ngStrap'
    ]);

    app.controller( 'BodyCtrl', ['$scope', '$injector', '$element', function( $scope, $injector, $element ) {

        var $timeout = $injector.get( '$timeout' );
        var $ = angular.element;
        var scope = $scope;
        var accept = {
            job: ['jobId', 'jobName', 'tasks']
        };
        var view = window.view = $scope.view = {
            scope: $scope,
            clearHashHost: [],
            jobs: [],
            jobsMapped: {},
            tasks: [],
            types: ['click', 'html', 'text', 'val'],
            jobStatus: 'list',
            selectedJob: null,
            inputJobName: ''
        };

        $scope.jobChanged = function() {

            storeSetting({
                jobs: view.jobs
            });
        };

        $scope.selectedJobChange = function() {

            storeSetting({
                selectedJobId: view.selectedJob.jobId
            });
        };

        $scope.setFocus = function( $event ) {

            $timeout(function() {

                $( $event.target ).siblings( 'input' ).focus();

            }, 10 );
        };

        $scope.newJob = function() {

            view.jobStatus = 'new';

            $timeout(function() {

                $element.find( '#inputJobName' ).focus();
            }, 10 );
        };

        $scope.editJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            view.jobStatus = 'edit';
            view.inputJobName = view.selectedJob.jobName;

            $timeout(function() {

                $element.find( '#inputJobName' ).focus();
            }, 10 );
        };

        $scope.updateJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            view.jobStatus = 'list';
            view.selectedJob.jobName = view.inputJobName;
            view.inputJobName = '';

            $scope.jobChanged();
        };

        $scope.addJob = function() {

            if ( !view.inputJobName ) {

                return;
            }

            view.jobStatus = 'list';

            view.jobs.push({
                jobId: ( new Date()).getTime(),
                jobName: view.inputJobName
            });

            view.inputJobName = '';

            view.selectedJob = view.jobs[view.jobs.length - 1];

            $scope.jobChanged();
            $scope.selectedJobChange();
        };

        $scope.deleteJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            if ( !window.confirm( 'Delete ?' )) {

                return;
            }

            view.jobs = view.jobs.filter(function( v ) {

                return v.jobId !== view.selectedJob.jobId;
            });

            view.selectedJob = view.jobs.length ? view.jobs[0] : null;

            $scope.jobChanged();
        };

        $scope.cancelJob = function() {

            view.jobStatus = 'list';
            view.inputJobName = '';
        };

        $scope.addTask = function() {

            var newTask = {
                id: new Date().getTime(),
                selector: 'div#container .search button[ng-click*=addSomething]',
                type: 'click',
                wait: 0,
                memo: 'new'
            };

            view.selectedJob.tasks = view.selectedJob.tasks || [];

            view.selectedJob.tasks.push( newTask );

            $scope.jobChanged();

            $scope.$applyAsync( setSortable );
        };

        $scope.removeTask = function( task ) {

            view.selectedJob.tasks = view.selectedJob.tasks.filter(function( v ) {

                return task.id !== v.id;
            });

            $scope.jobChanged();
        };

        $scope.copyTasks = function() {

        };

        $scope.clearTasks = function() {

            if ( !window.confirm( 'Clear all ?' )) {

                return;
            }

            view.selectedJob.tasks.length = 0;
            $scope.jobChanged();
            $scope.$applyAsync( setSortable );
        };

        function setSortable() {

            $( '#tasks-table ' ).sortable({
                items: 'tr.task-row',
                handle: '.change-order',
                revert: true,
                placeholder: 'bg-warning sortable-placeholder',
                update: sorttableUpdated
            });
        }

        function sorttableUpdated( event, ui ) {

            var mapTasks = {};
            var $rows = ui.item.closest( 'tbody' ).find( '.task-row' );
            var sortted = [];

            view.selectedJob.tasks.forEach(function( v ) {

                mapTasks[v.id] = v;
            });

            view.selectedJob.tasks.length = 0;

            $rows.each(function() {

                var $r = $( this );
                var id = $r.data( 'task-id' );

                view.selectedJob.tasks.push( mapTasks[id] );
            });

            $scope.jobChanged();
            $scope.$applyAsync();
        }

        chrome.storage.local.getAsync(['setting', 'jobs', 'tasks', 'selectedJobId']).then(function( storage ) {

            var setting = storage.setting || {};

            view.clearHashHost = setting.clearHashHost || [];
            view.jobs = storage.jobs || [];
            view.tasks = storage.tasks || [];

            if ( storage.selectedJobId ) {

                view.selectedJob = view.jobs.find(function( v ) {

                    return v.jobId === storage.selectedJobId;
                });

            } else if ( !view.selectedJob && view.jobs.length ) {

                view.selectedJob = view.jobs[0];
            }

            $scope.$applyAsync(function() {

                setSortable();
            });

        });

        function storeSetting( setting ) {

            var storage = angular.copy( setting );

            if ( _.isArray( storage.jobs )) {

                storage.jobs = storage.jobs.map(function( v ) {

                    // delete unaccept property
                    return _.pick( v, accept.job );
                });
            }

            return chrome.storage.local.setAsync( storage ).then(function() {

                console.log( 'saved' );
            });
        }
    }]);
}

main();
