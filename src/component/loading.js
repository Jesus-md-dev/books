import CircularProgress from '@mui/material/CircularProgress';

const Loading = () => {
    return(
        <div className='h-full flex justify-center'>
            <CircularProgress color="success" className='mt-[50%]' />
        </div>
    );
}

export default Loading;