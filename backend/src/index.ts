import { app } from './app';
import { config } from './config';

const port = config.port || 3000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📚 Environment: ${config.env}`);
  console.log(`🔗 Server URL: http://localhost:${port}`);
});