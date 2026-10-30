const NoService = () => (
    <div className="content-center-straight">
        <div className="card mx-auto max-w-md text-center" role="alert">
            <h1 className="text-2xl text-danger">¡Servicio no disponible!</h1>
            <p className="text-muted mt-2">No se han podido cargar los libros. Inténtalo de nuevo en unos minutos.</p>
        </div>
    </div>
);

export default NoService;
