import { AzureFunction, Context } from "@azure/functions"
import { initializeApp } from "firebase/app";
import { addDoc, collection, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import * as mqtt from "mqtt";
import { IAnalyzer } from './Interfaces/IAnalyzer';

export const app = initializeApp({
    apiKey: 'AIzaSyC6G7wA478gT6rgWgcvYxavAHx9-r2dI',
    authDomain: 'soulpot-5fbe6.firebaseapp.com',
    projectId: 'soulpot-5fbe6'
});

export const firestore = getFirestore(app);

const months = ["jan", 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const IoTHubTrigger: AzureFunction = async function (context: Context, IoTHubMessages: any[]): Promise<void> {
    const client = mqtt.connect('mqtt://alesia-julianitow.ovh:9443');
    const topic = 'events';
    context.log(IoTHubMessages);
    const today = new Date();
    const day = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
    const logId = `${months[today.getMonth()]}_${day}_${today.getFullYear()}_${today.getHours()}_${today.getMinutes()}`;
    client.on('connect', () => {
        client.subscribe(topic, (err: Error) => {
            if (!err) {
                IoTHubMessages.forEach(async message => {
                    if (message.device_id !== undefined) {
                        client.publish(`${topic}/${message.device_id}`, JSON.stringify(message));
                        const analyzer: IAnalyzer = {
                            battery: 0,
                            humidity: message.data.hygro,
                            luminosity: message.data.lum,
                            temperature: message.data.temp,
                        };
                        try {
                            const _doc = doc(firestore, "analyzers", `${message.device_id}`);
                            await setDoc(_doc, analyzer);
                            const logsRef = doc(firestore, "analyzers", `${message.device_id}`, 'logs', logId);
                            await setDoc(logsRef, analyzer);
                        } catch(err) {
                            context.log(err);
                        }
                    }
                });
            } else {
                context.log(err.message);
            }
        });
    });
};

export default IoTHubTrigger;
module.exports = IoTHubTrigger;