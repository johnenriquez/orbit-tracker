# orbit-tracker

Welcome to [Orbit Tracker](https://johnenriquez.github.io/orbit-tracker/)!

## About

The Orbit Tracker gathers [real-time satellite data](http://n2yo.com/api/) and renders it to an interactive 3D globe.

## Technologies

- This project was built using ES6 Javascript
- For 3D rendering, three.js was used as a wrapper around WebGL
- dev'd with webpack and sass

## Errors

- The map texture may be scaled a little off, causing a little bit of inaccuracy
- The plotting equations also assume a perfectly round earth
- assumes an observation location of San Francisco, 0m above sea level

## Future Development

- Switch to calculating directly off TLE
    - decreases API requests
    - allows calculation of longer footprints
- Dynamic search for a specific satellite
- Dynamic observation location

## Shoutouts

- [Solar System Scope](https://www.solarsystemscope.com/textures/) for the earth texture
- [N2YO](https://www.n2yo.com/) for the data

## Contributions?

Would love em.