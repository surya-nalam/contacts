const express = require("express");
const dotenv = require("dotenv");


dotenv.config();
const app = express();

app.use(express.json());

const startServer = async () => { 


  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();