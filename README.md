# Node.JS API boilerplate

Basic structure for Node.JS RESTful API with `Bearer` and `Basic` authorization, logs, multithreading and zero downtime modules restart. Based on [Restify](http://restify.com/).

## Install and Run
 - `npm install` - install all required Node.JS modules
 - `npm start` - run API

## Config
Main config is inside `config/config.js`, following modules are manadatory:
 - `docs` - generate docs with menu and anchors based on MD files
 - `static` - handle static files throught Restify API
 - `maintenance` - module/method for restart API threads and clear classes cache

## Authorization
API support two methods for authorization.

### Bearer
`curl -v -H "Authorization: Bearer hello" http://127.0.0.1:8081/demo/123/`
### Basic
`curl -v -u demo:123 http://127.0.0.1:8081/demo/1/`

## Example method
There is only one example method `/demo/:id/` that will return the same `ID` if it greater than zero or error. Example above.

## Restart API modules
API modules (for ex. after update) could be restart without complete restart of API server. To make this possible every thread shut down one by one and respawn again after clearing cache with modules.

`curl -v -H "Authorization: Bearer hello" http://127.0.0.1:8081/maintenance/restart/`

