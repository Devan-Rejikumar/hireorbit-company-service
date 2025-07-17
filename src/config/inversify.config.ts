import "reflect-metadata";
import { Container } from "inversify";
import TYPES from "./types";
import { CompanyRepository } from "../repositories/CompanyRepository";
import { CompanyService } from "../services/CompanyService";
import { EmailService } from "../services/EmailService";
import { CompanyController } from "../controllers/CompanyController"; 

const container = new Container();

container.bind<CompanyRepository>(TYPES.CompanyRepository).to(CompanyRepository);
container.bind<CompanyService>(TYPES.CompanyService).to(CompanyService);
container.bind<EmailService>(TYPES.EmailService).to(EmailService);
container.bind<CompanyController>(TYPES.CompanyController).to(CompanyController); 

export default container;