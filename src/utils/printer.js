// src/utils/printer.js
import { jsPDF } from "jspdf";

/* ======================
    helper: platform detect
   ====================== */
export function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}
export function isMobile() {
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

/* ======================
    PDF generator 58mm portrait
    - fixed label col 12 chars, right align value
    - returns Blob
   ====================== */
export function generate58mmPdf(payload) {
    // payload fields: kirimanId, nopol, kirimanDate, username, supplier, panjang, lebar, tinggi, plus, volume
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [58, 75] // width 58mm, height flexible (200mm arbitrary) 
    });

    // margins and line spacing
    const left = 4;
    const contentWidth = 58 - left * 2;
    let y = 6;
    const lineHeight = 5;
    doc.setFont("helvetica");
    doc.setFontSize(10);

    // center title
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Tentrem Perkasa", 58 / 2, y, { align: "center" });
    y += lineHeight;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("-----------------------------------------------------", left, y);
    y += lineHeight;

    // helper to print fixed-label + right-aligned value in fixed columns
    function printLabelValue(label, value) {
        // label column width in mm -- choose 26mm for labels; value area right aligned
        const labelColW = 26;
        const valColW = contentWidth - labelColW;
        const labelX = left;
        const valXRight = left + labelColW + valColW; // right edge
        // print label left
        doc.text(`${label}`, labelX, y);
        // print value right aligned in valColW
        // measure text width to align right
        const valueStr = String(value);
        const textWidth = doc.getTextWidth(valueStr) * (doc.internal.getFontSize() / 72) * 25.4 / (25.4); // simpler: use doc.getTextWidth then adjust by fontSize
        // easier: use text align options (x=rightEdge, align='right')
        doc.text(valueStr, valXRight, y, { align: "right" });
        y += lineHeight;
    }

    printLabelValue("No Struk", payload.kirimanId);
    printLabelValue("Nopol", payload.nopol);
    printLabelValue("Tgl", payload.kirimanDate);
    printLabelValue("Operator", payload.username);
    printLabelValue("Supplier", payload.supplier);
    y += 0;
    doc.text("-----------------------------------------------------", left, y);
    y += lineHeight;
    
    printLabelValue("Panjang", `${payload.panjang} cm`);
    printLabelValue("Lebar", `${payload.lebar} cm`);
    printLabelValue("Tinggi", `${payload.tinggi} cm`);
    printLabelValue("Plus", `${payload.plus} cm`);
    printLabelValue("Volume", `${Number(payload.volume).toFixed(2)} m³`);

    doc.text("-----------------------------------------------------", left, y);

    const blob = doc.output("blob");

    console.log(payload.nopol);
    doc.save(`kiriman_${payload.nopol}_${payload.kirimanDate}.pdf`)
    return blob;
}

/* ======================
    ESC/POS helper (bytes builder)
    - simple functions for center, left, right alignment, bold, line, cut
    - returns Uint8Array
   ====================== */
export function escposBuildLines(payload) {
    // helper to append arrays
    const append = (a, b) => {
        const res = new Uint8Array(a.length + b.length);
        res.set(a, 0);
        res.set(b, a.length);
        return res;
    };

    const encoder = new TextEncoder();

    // ESC/POS commands
    const ESC = 0x1b;
    const GS = 0x1d;

    const init = new Uint8Array([ESC, 0x40]); // initialize
    let data = init;

    function line(text = "") {
        data = append(data, encoder.encode(text));
        data = append(data, new Uint8Array([0x0a])); // LF
    }

    function center(text) {
        // set align center
        data = append(data, new Uint8Array([ESC, 0x61, 0x01]));
        line(text);
        data = append(data, new Uint8Array([ESC, 0x61, 0x00])); // reset left
    }

    function drawLine() {
        line("--------------------------------");
    }

    function labelValueFixed(label, value) {
        // Fixed label width char count ~12; we will compose plain string with padding.
        // Note: ESC/POS monospaced on thermal; use spaces to align to right assuming font width.
        const totalCols = 32; // typical 58mm ~ 32 chars with font size default
        const labelWidth = 12;
        const labelText = label.padEnd(labelWidth, " ");
        const valueText = String(value);
        const available = totalCols - labelWidth - 3; // leave some space
        let v = valueText;
        if (v.length > available) v = v.slice(0, available);
        // pad left for right alignment
        const padLeft = available - v.length;
        const paddedValue = " ".repeat(padLeft) + v;
        line(`${labelText}: ${paddedValue}`);
    }

    // build content
    center("Tentrem Perkasa");
    drawLine();
    labelValueFixed("No Struk", payload.kirimanId);
    labelValueFixed("Nopol", payload.nopol);
    labelValueFixed("Tgl", payload.kirimanDate);
    labelValueFixed("Operator", payload.username);
    labelValueFixed("Supplier", payload.supplier);
    drawLine();
    labelValueFixed("Panjang", payload.panjang);
    labelValueFixed("Lebar", payload.lebar);
    labelValueFixed("Tinggi", payload.tinggi);
    labelValueFixed("Plus", payload.plus);
    labelValueFixed("Volume", `${Number(payload.volume).toFixed(2)} m3`);
    drawLine();

    // feed and cut (some printers support GS V)
    data = append(data, new Uint8Array([0x1b, 0x64, 0x02])); // feed 2 lines
    data = append(data, new Uint8Array([GS, 0x56, 0x00])); // full cut (may not supported)

    return data;
}

/* ======================
    WebBluetooth send helper
    - tries several common service/characteristic UUIDS used by thermal over BLE bridges
    - returns characteristic object or throws
   ====================== */
export async function connectToBluetoothPrinter() {
    if (!navigator.bluetooth) throw new Error("Browser tidak mendukung Web Bluetooth");

    // try several common service UUIDs used by thermal printers (not guaranteed)
    const services = [
        0xFFE0,
        "0000ffe0-0000-1000-8000-00805f9b34fb",
        "000018f0-0000-1000-8000-00805f9b34fb", // sometimes used
        "6e400001-b5a3-f393-e0a9-e50e24dcca9e" // Nordic UART service (nordic uart)
    ];

    // request device
    const opts = {
        filters: [], // leave empty to allow manual pick? better to offer acceptAllDevices
        optionalServices: services
    };

    // attempt requestDevice with acceptAllDevices (user will choose)
    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: services
    });

    const server = await device.gatt.connect();

    // find writable characteristic in available services
    for (const sv of services) {
        try {
            const svc = await server.getPrimaryService(sv);
            // try common characteristic ids
            const charCandidates = [
                0xFFE1,
                "0000ffe1-0000-1000-8000-00805f9b34fb",
                "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
                "00002a3d-0000-1000-8000-00805f9b34fb"
            ];
            for (const c of charCandidates) {
                try {
                    const ch = await svc.getCharacteristic(c);
                    // check properties
                    if (ch.properties.write || ch.properties.writeWithoutResponse) {
                        return { device, server, service: svc, characteristic: ch };
                    }
                } catch (e) {
                    // continue try other char candidate
                }
            }
        } catch (e) {
            // service not available, continue
        }
    }

    // fallback: try first service/characteristic
    throw new Error("Tidak menemukan characteristic writeable di device tersebut.");
}

/* ======================
    send ESC/POS bytes to connected characteristic
   ====================== */
export async function sendToBluetooth(ch, bytes) {
    // split into chunks if characteristic requires small writes
    const MTU = 180; // safe chunk size
    for (let i = 0; i < bytes.length; i += MTU) {
        const chunk = bytes.slice(i, i + MTU);
        await ch.writeValue(chunk);
    }
}
