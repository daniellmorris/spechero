import express from 'express';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';

export const initSpecHeroHttp = async ({expressApp, operationHandlers, apiSpecFile}) => {
  // Create express app
  const app = expressApp || express();

  // Use cors
  if (!expressApp) {
    app.use(cors());

    // Use body parser
    app.use(express.json());
  }

  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpecFile,
      validateRequests: true, // (default)
      validateResponses: false, // false by default
      operationHandlers: {
        resolver: function(basePath, route, fullSchema) {
          const schema = fullSchema
              ?.['paths']
              ?.[route.openApiRoute]
              ?.[route.method.toLowerCase()];
          // Pluck controller and function names from operationId
          const handlerObj = schema['x-hero-handler']
          const operationId = (handlerObj?.action || schema['operationId'])
              ?.split('.');
          const operationHandler = handlerObj?.id;
          // Get path to module and attempt to require it
          const handler = operationHandlers[operationHandler]?.default;

          // error checking to make sure the function actually exists
          // on the handler module
          if (handler?.[operationId] === undefined) {
            console.log(
                `Could not find a [${operationId}] function in ${operationHandler}.js when trying to route [${route.method} ${route.expressRoute}].`,
            );
            return (_req, res) => {
              res.status(404).json({
                message: `Could not find a [${operationId}] function in ${operationHandler}.js when trying to route [${route.method} ${route.expressRoute}].`,
              });
            };
          }
          // Finally return our function
          return handler[operationId];
        },
      },
    }),
  );

  app.use((err, req, res, next) => {
    console.log(err);
    // format error
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  });

  return app;
};
