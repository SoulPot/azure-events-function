export interface IAnalyzer {
    battery: number;
    humidity: number;
    luminosity: number;
    temperature: number;
    plantID?: string;
    userID?: string;
    wifiName?: string;
}
