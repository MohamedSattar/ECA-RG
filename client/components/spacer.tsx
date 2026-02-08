const Spacer = ({ color }: { color: string }) => (
    <div className="container">      
        <div className={`container border border-[${color}]`}></div>
      </div>
);
export default Spacer;
    