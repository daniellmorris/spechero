import { initSpecHeroHttp } from '@spechero/openapi';
import * as routes from './routes/index.js';

// Initialize the app
const app = await initSpecHeroHttp({operationHandlers: routes, apiSpecFile: './openapi.yaml'});

// Start the app
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
