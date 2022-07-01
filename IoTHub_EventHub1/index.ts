import { AzureFunction, Context } from "@azure/functions"
import { initializeApp } from "firebase/app";
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import * as mqtt from "mqtt";
import { IAnalyzer } from './Interfaces/IAnalyzer';

const MQTT_HOST = 'mqtt://alesia-julianitow.ovh:9443'
const MQTT_USERNAME = 'soulpot';
const MQTT_PASSWORD = 'soulpot';
const MQTT_CLIENT_ID = 'Azure_IoT_Events';

export const app = initializeApp({
    apiKey: 'AIzaSyC6G7wA478gT6rgWgcvYxavAHx9-r2dI',
    authDomain: 'soulpot-5fbe6.firebaseapp.com',
    projectId: 'soulpot-5fbe6'
});

export const firestore = getFirestore(app);

const months = ["jan", 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const IoTHubTrigger: AzureFunction = async function (context: Context, IoTHubMessages: any[]): Promise<void> {
    context.log(IoTHubMessages);

    const client = mqtt.connect(MQTT_HOST, { username: MQTT_USERNAME, password: MQTT_PASSWORD, clientId: MQTT_CLIENT_ID});
    const topic = 'events';
    const today = new Date();
    const day = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
    const month = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : today.getMonth() + 1;
    const minutes = today.getMinutes() < 10 ? `0${today.getMinutes()}`: today.getMinutes();
    const logId = `${months[today.getMonth()]}_${day}_${today.getFullYear()}_${today.getHours()}_${minutes}`;
    const dateAttr = `${day}/${month}/${today.getFullYear()} ${today.getHours()}:${minutes}`;
    let message;

    IoTHubMessages.forEach(async msg => {
        if (msg.device_id !== undefined) {
            message = msg;                        
        }
    });

    const hum: number = +message.data.hygro;
    const lum: number = +message.data.lum;
    const temp: number = +message.data.temp;
    const analyzer: IAnalyzer = {
        // battery: 0,
        dateTime: dateAttr,
        humidity: hum,
        luminosity:lum,
        temperature: temp,
    };

    try {
        const _doc = doc(firestore, "analyzers", `${message.device_id}`);
        const previousDoc = await getDoc(_doc);
        const previousData = previousDoc.data() as unknown as IAnalyzer;

        if (previousData.userID === undefined) {
            throw Error('No userId found in Firstore');
        }

        analyzer.plantID = previousData.plantID;
        analyzer.userID = previousData.userID;
        analyzer.wifiName = previousData.wifiName;
        analyzer.name = previousData.name

        await setDoc(_doc, analyzer);
        const logsRef = doc(firestore, "analyzers", `${message.device_id}`, 'logs', logId);
        await setDoc(logsRef, analyzer);
    } catch(err) {
        context.log(err);
        return;
    }

    context.log(analyzer);

    client.on('connect', () => {
        client.subscribe(topic, (err: Error) => {
            if (!err) {
                client.publish(`${topic}/${message.device_id}`, JSON.stringify(message));
                client.end();
            } else {
                context.log(err.message);
            }
        });
    });
};

export default IoTHubTrigger;
module.exports = IoTHubTrigger;