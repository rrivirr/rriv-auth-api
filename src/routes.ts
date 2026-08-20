import express from "express";
import {
  check,
  listObjects,
  writeRelationships,
  read,
  listUsers,
} from "./handler.js";

const router = express.Router();

router.route("/check").post(check);
router.route("/relationship").post(writeRelationships);
router.route("/list-objects").post(listObjects);
router.route("/list-users").post(listUsers);
router.route("/read").post(read);

export default router;
