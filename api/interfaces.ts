export interface Route {
  id: number;
  code: string;
  name: string;
  systemUser?: string;
  systemDate?: Date;
}

export interface Validation {
  id: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  registrationTime: Date;
  vehicleId: number;
  systemUser?: string;
  systemDate?: Date;
  vehicle?: Vehicle;
}

export interface Vehicle {
  id: number;
  unitRegister: string;
  licensePlate: string;
  routeId: number;
  systemUser?: string;
  systemDate?: Date;
  tempId?: string;
  route?: Route;
  validations?: Validation[];
}