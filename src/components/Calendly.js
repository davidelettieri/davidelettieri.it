import React, { useEffect } from "react";

const Calendly = () => {
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://assets.calendly.com/assets/external/widget.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        }
    }, []);

    return <div className="calendly-inline-widget" data-url="https://calendly.com/talk-with-davide-lettieri/60min" style={{ minWidth: '320px', height:'950px'}}></div>;
}

export default Calendly;