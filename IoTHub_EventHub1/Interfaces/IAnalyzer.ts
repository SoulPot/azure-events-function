export interface IAnalyzer {
    battery: number;
    humidity: number;
    luminosity: number;
    temperature: number;
    plantId?: string;
    userId?: string;
}
