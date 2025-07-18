import { Company, Otp } from "@prisma/client";

export interface ICompanyRepository{
    findByEmail(email:string):Promise<Company|null>;
    createCompany(data:{email:string,password:string,companyName:string}):Promise<Company>;
    findById(id:string):Promise<Company|null>;
    saveOTP(email:string,otp:number):Promise<Otp>;
    findOTP(email:string):Promise<Otp|null>;
    deleteOtp(email:string):Promise<void>;
    getAllCompanies():Promise<Company[]>;
}