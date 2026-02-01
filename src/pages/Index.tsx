import { useEffect } from "react";
import { supabase } from "./integrations/supabase/client";

function App() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from("computed_metrics").select("*");

      console.log("DB TEST:", data, error);
    };

    test();
  }, []);

  return <div>Supabase connected 🚀</div>;
}

export default App;
