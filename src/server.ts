import app from "./app.js";
import config from "./infra/get-config.js";

const port = config.NODE_PORT || 3006;

app.listen(port, () => {
  console.log(`running on port ${port}`);
});
