import express from "express";
import {
  check,
  listObjects,
  writeRelationships,
  read,
  readResource,
  listUsers,
} from "./handler.js";

const router = express.Router();

router.route("/check").post(check);
router.route("/relationship").post(writeRelationships);
router.route("/list-objects").post(listObjects);
router.route("/list-users").post(listUsers);
router.route("/read").post(read);
router.route("/read-resource").post(readResource);

export default router;
