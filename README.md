# TV and Movie Graph App

This is a fist attempt at a React app. It uses [theMovieDB.org](theMovieDB.org) API for data and then renders a [react-force-graph](https://vasturiano.github.io/react-force-graph/) with the results.

Note to self, to deploy:
1. Add `"homepage": "https://jack.provance.us/tv-graph"` to package.json
3. Delete the current build directory if it exists
4. Run `yarn build`
5. Delete the web server directory
6. Copy the local build to the web server `cd ./build` `scp -r ./* login@host.com:www/jack/tv-graph/`
