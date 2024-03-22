import React, { useEffect } from "react";

export default function Root({children}) {
  useEffect(() => {
      const remoteCronitor = document.createElement('script');
      remoteCronitor.src = "https://rum.cronitor.io/script.js";
      remoteCronitor.async = true;
      document.body.appendChild(remoteCronitor);

      const cronitor = document.createElement('script');
      cronitor.src = "/js/start-cronitor.js";
      cronitor.async = true;
      document.body.appendChild(cronitor);

      return () => {
          document.body.removeChild(remoteCronitor);
          document.body.removeChild(cronitor);
      }
  }, []);
  return <>{children}</>;
}