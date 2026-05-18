import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapLoaderService {
  private static promise: Promise<void>;

  public load(): Promise<void> {
    if (!MapLoaderService.promise) {
      MapLoaderService.promise = new Promise<void>((resolve, reject) => {
        // Add the script to the document
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.firebaseConfig.apiKey}`; // Using key from environment
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        // Resolve the promise when the script has loaded
        script.onload = () => resolve();
        script.onerror = (error) => reject(error);
      });
    }
    return MapLoaderService.promise;
  }
}
