import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { storage } from "../services/storage";
import { syncQueue } from "../services/syncQueue";
import { MediaItem } from "../types";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import { Upload, Trash2, Star, Image as ImageIcon } from "lucide-react";
import { Badge } from "../components/ui/badge";

export default function Media() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMedia();
  }, [user]);

  const loadMedia = async () => {
    if (!user?.artistId) return;

    try {
      // Load from local storage first
      const cached = await storage.getAllItems<MediaItem>("media");
      if (cached.length > 0) {
        setMedia(cached.sort((a, b) => a.order - b.order));
      }

      // Fetch from API
      const data = await apiClient.media.getByArtist(user.artistId);
      setMedia(data.sort((a, b) => a.order - b.order));

      // Update cache
      for (const item of data) {
        await storage.setItem("media", item.id, item);
      }
    } catch (error) {
      console.error("Failed to load media:", error);
      toast({
        title: "Error",
        description: "Failed to load media",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !user?.artistId) return;

    setUploading(true);
    const uploadedItems: MediaItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a valid image or video`,
            variant: "destructive",
          });
          continue;
        }

        // Simulate upload
        const mediaItem = await apiClient.media.upload(user.artistId, file);
        mediaItem.order = media.length + uploadedItems.length;
        
        await storage.setItem("media", mediaItem.id, mediaItem);
        uploadedItems.push(mediaItem);

        // Add to sync queue
        await syncQueue.enqueue({
          action: "create",
          entity: "media",
          data: mediaItem,
        });
      }

      setMedia((prev) => [...prev, ...uploadedItems]);

      toast({
        title: "Upload successful",
        description: `${uploadedItems.length} file(s) uploaded`,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Some files could not be uploaded",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setMedia((prev) => prev.filter((item) => item.id !== id));
      await storage.removeItem("media", id);
      await syncQueue.enqueue({
        action: "delete",
        entity: "media",
        data: { id },
      });

      toast({
        title: "Media deleted",
        description: "File removed successfully",
      });
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, [media, user]);

  if (loading) {
    return <div className="animate-pulse">Loading media...</div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold">Media</h1>
        <p className="text-muted-foreground">Manage your portfolio images and videos</p>
      </div>

      {/* Upload Area */}
      <Card
        className="border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={uploading}
        />
        
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {uploading ? "Uploading..." : "Upload Media"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports: Images (JPG, PNG, GIF) and Videos (MP4, MOV)
        </p>
      </Card>

      {/* Media Grid */}
      {media.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No media uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden group relative">
              <div className="aspect-square relative">
                {item.type === "image" ? (
                  <img
                    src={item.dataUrl || item.url}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={item.dataUrl || item.url}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                )}
                
                {item.syncStatus === "pending" && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    Syncing...
                  </Badge>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-2">
                <p className="text-xs truncate text-muted-foreground">
                  {item.fileName}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
