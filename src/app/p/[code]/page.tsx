import type {Metadata} from 'next';
import Home from '../../page';

// Links are short and stable, but the original app handles authentication and
// verifies workspace membership before showing any production content.
export const metadata:Metadata={
  title:'Producción compartida · AVODAH',
  description:'Abrí una producción compartida con tu equipo en AVODAH.',
  robots:{index:false,follow:false}
};

export default function SharedProductionPage(){
  return <Home/>;
}
