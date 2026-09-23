import 'dotenv/config';
import app from './app.js';
import { connectToDb } from './database/connect.js';

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectToDb();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();