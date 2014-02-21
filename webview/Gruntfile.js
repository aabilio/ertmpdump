'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        nggettext_extract: {
            pot: {
                files: {
                    'static/po/easy-rtmpdump.pot': ['easy-rtmpdump.html', 'static/js/app.js']
                }
            },
        },

        nggettext_compile: {
            all: {
                files: {
                    'static/js/translations.js': ['static/po/*.po']
                }
            },
        },
    });

    grunt.loadNpmTasks('grunt-angular-gettext');

    grunt.registerTask('default', ['nggettext_extract', 'nggettext_compile']);
};
