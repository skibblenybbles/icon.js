'use strict';

module.exports = function(grunt) {
    var path = require('path'),

        basePath = path.dirname(__filename),
        gruntPath = path.join(basePath, 'grunt');

    // Time how long grunt tasks take.
    require('time-grunt')(grunt);

    // Load the grunt configuration automatically.
    require('load-grunt-config')(grunt, {
        gruntPath: gruntPath,
        init: true,
        jitGrunt: {
            // Tasks that have mismatching config filenames.
        },
        data: {
            // Package data.
            package: grunt.file.readJSON('package.json'),

            // Paths.
            paths: {
                // Base.
                base: basePath,

                // Grunt.
                grunt: gruntPath
            }
        }
    });
};
