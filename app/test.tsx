import { UploadButton } from "@/components/uploadthing";

export default function test() {
  return (
    <UploadButton
      endpoint="documentUploader"
      onClientUploadComplete={(res) => {
        console.log(res[0].key)
        
        // Do something with the response
        console.log("Files: ", res);
        alert("Upload Completed");
      }}
      onUploadError={(error: Error) => {
        // Do something with the error.
        alert(`ERROR! ${error.message}`);
      }}
    />
  );
}
