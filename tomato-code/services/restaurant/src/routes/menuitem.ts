import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
  addMenuItem,
  deleteMenuItem,
  getAllItems,
  updateMenuItemCuisine,
  updateMenuItemOffer,
  updateMenuItemPrice,
  toggleMenuItemAvailability,
} from "../controllers/menuitem.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isSeller, uploadFile, addMenuItem);
router.get("/all/:id", isAuth, getAllItems);
router.delete("/:itemId", isAuth, isSeller, deleteMenuItem);
router.put("/status/:itemId", isAuth, isSeller, toggleMenuItemAvailability);
router.put("/offer/:itemId", isAuth, isSeller, updateMenuItemOffer);
router.put("/cuisine/:itemId", isAuth, isSeller, updateMenuItemCuisine);
router.put("/price/:itemId", isAuth, isSeller, updateMenuItemPrice);

export default router;
