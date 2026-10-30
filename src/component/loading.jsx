
import CircularProgress from '@mui/material/CircularProgress';

/**
 * Loading spinner component using Material UI.
 * @returns {JSX.Element}
 */
const Loading = () => (
    <div className="h-full flex justify-center">
        <CircularProgress color="primary" className="mt-[50%]" />
    </div>
);

export default Loading;