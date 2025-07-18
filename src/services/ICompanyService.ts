import { Company } from "@prisma/client";

export interface ICompanyService{
    register(email:string,password:string,companyName:string):Promise<Company>;
    login(email:string,password:string):Promise<{company:Company;token:string}>;
    generateOTP(email:string):Promise<{message:string}>
    verifyOTP(email:string,otp:number):Promise<{message:string}>;
    resendOTP(email:string):Promise<{message:string}>;
}