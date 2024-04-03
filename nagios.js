import express from 'express';
import axios from 'axios';
import https from 'https';

const app = express();
const port = 3000;

// Beispiel-Endpunkt: /api/nagios/healthiness/:hostname/:servicename
app.get('/api/nagios/healthiness/:hostname/:servicename', async (req, res) => {
    try {
        const { hostname, servicename } = req.params;

        // Annahme: Nagios verfügt über eine REST-API, die den Status abruft
        const nagiosUrl = `https://localhost:5665/v1/objects/services?service=${hostname}!${servicename}`;
        const username = 'icingaadmin'; // Ihr Benutzername
        const password = 'icinga'; // Ihr Passwort

        // Senden Sie die Anfrage mit Authentifizierung über den Header und ignorieren Sie selbstsignierte Zertifikate
        const nagiosResponse = await axios.get(nagiosUrl, {
            auth: {
                username,
                password,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false, // Ignorieren Sie selbstsignierte Zertifikate
            }),
        });

        // Auswertung des Nagios-Status
        const exitStatus = nagiosResponse.data.results[0].attrs.last_check_result.exit_status;
        let healthiness;

        switch (exitStatus) {
            case 0:
                healthiness = 'green';
                break;
            case 1:
                healthiness = 'orange';
                break;
            case 2:
                healthiness = 'red';
                break;
            default:
                healthiness = 'unknown';
        }

        // Extrahieren des Unix-Timestamps
        const unixTimestamp = nagiosResponse.data.results[0].attrs.last_check;

        // Konvertieren des Unix-Timestamps in ISO-Format
        const timestamp = new Date(unixTimestamp * 1000).toISOString();
        const nagiosOutput = nagiosResponse.data.results[0].attrs.last_check_result.output;

        // Senden Sie die Antwort als JSON zurück
        res.json({ healthiness, timestamp, hints: [
            { tagname: 'outputNagios', tagvalue: nagiosOutput },
            { tagname: 'Service', tagvalue: 'Health' },
        ] });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ein Fehler ist aufgetreten');
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
