const utcTimestamp = "2026-05-13T07:46:22.709Z";



function fromUTCtoIst(utcTimeStamp) {
    // Create a Date object (automatically parses UTC)
    const dateObject = new Date(utcTimestamp);

    // Format directly into IST using the Asia/Kolkata timezone
    const istString = dateObject.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        dateStyle: "long",
        timeStyle: "medium"
    });
    console.log(istString); 
    return istString;
}


fromUTCtoIst(utcTimestamp);