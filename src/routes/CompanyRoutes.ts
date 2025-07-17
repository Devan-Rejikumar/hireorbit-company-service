import { Router } from "express";
import container from '../config/inversify.config'
import TYPES from "../config/types";
import { CompanyController } from "../controllers/CompanyController";
import { authenticateCompanyJWT } from "../middleware/auth";


const router = Router();
const companyController = container.get<CompanyController>(TYPES.CompanyController);

router.post('/register',(req,res)=> companyController.register(req,res));
router.post('/login',(req,res)=>companyController.login(req,res));
router.post('/generate-otp',(req,res)=>companyController.generateOTP(req,res));
router.post('/verify-otp',(req,res)=>companyController.verifyOTP(req,res));
router.post('/resend-otp',(req,res)=>companyController.resendOTP(req,res));
router.get("/me", authenticateCompanyJWT, (req, res) => companyController.getMe(req, res));
router.post('/logout', (req, res) => companyController.logout(req, res));

export default router;