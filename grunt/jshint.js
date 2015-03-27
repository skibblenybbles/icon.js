'use strict';

module.exports = {
    options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        freeze: true,
        immed: true,
        noarg: true,
        nonew: true,
        plusplus: true,
        quotmark: 'single',
        undef: true,
        unused: true
    },
    src: {
        files: {
            src: [
                'Gruntfile.js',
                '<%= paths.base %>/*.js',
                '<%= paths.base %>/lib/**/*.js'
            ]
        },
        options: {
            globalstrict: true,
            globals: {
                __filename: true,
                module: true,
                require: true
            }
        }
    }
};
