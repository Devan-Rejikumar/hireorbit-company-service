import { Request,Response } from "express";
import { inject, injectable} from "inversify";
import TYPES from "../config/types";
import { ICompanyService } from "../services/ICompanyService";    
@injectable()
export class CompanyController{
    constructor(@inject(TYPES.ICompanyService) private companyService:ICompanyService){}
      async register(req: Request, res: Response): Promise<void> {
    try {
        console.log('dddddddddddddd',req.body);
      const { email, password, companyName} = req.body;
      const company = await this.companyService.register(email, password, companyName);
      res.status(201).json({ company });
    } catch (err: any) {
      if (err.message === "Email already in use") {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  }

  async login(req:Request,res:Response):Promise<void>{
    try {
        const{email,password}=req.body;
        const{company,token}= await this.companyService.login(email,password);
        res.cookie("token",token,{httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:"lax",maxAge:24*60*1000})
        .status(200).json({company})

    } catch (err:any) {
        res.status(500).json({ error: err.message });
    }
  }

   async generateOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      const result = await this.companyService.generateOTP(email);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        res.status(400).json({ error: "Email and OTP are required" });
        return;
      }
      const result = await this.companyService.verifyOTP(email, parseInt(otp));
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      const result = await this.companyService.resendOTP(email);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    const company = (req as any).company;
    if (!company) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { id, companyName, email } = company;
    res.json({ id, companyName, email });
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logged out successfully' });
  }
}