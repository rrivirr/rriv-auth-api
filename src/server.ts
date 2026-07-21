import app from "./app.ts";

const port = process.env.NODE_PORT || 7056;

app.listen(port, () => {
  console.log(`running on port ${port}`);
});
