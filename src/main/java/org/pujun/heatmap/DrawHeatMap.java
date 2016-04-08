package org.pujun.heatmap;

/**
 * Created by milletpu on 16/4/6.
 */

import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import javax.imageio.ImageIO;

import static java.lang.Math.abs;


public class DrawHeatMap{
    public BufferedImage image;
    public Graphics2D graphics;
    public String png = "/Users/milletpu/airvis/src/main/java/org/pujun/heatmap/china-map-screenshot.png";
    public String outpng = "/Users/milletpu/airvis/src/main/java/org/pujun/heatmap/outimage.png";
    public void init() throws IOException {
        File f = new File(png);
        image = ImageIO.read(f);
        graphics = (Graphics2D)image.getGraphics();
    }

    public void drawEllipse(double lat, double lon) throws IOException {    //左上角起始坐标lat54.1, lon72.3
        double x,y;
        x = abs(lon - 72.3) * 17.1;
        if(lat <= 25) {
            y = abs(lat - 54.1) * 25 - (40 - lat) * 5;
        }else if( lat>25 && lat<40){
            y = abs(lat - 54.1) * 25 - (40 - lat) * 4;
        }else{
            y = abs(lat - 54.1) * 25;
        }

        Ellipse2D ellipse = new Ellipse2D.Double(x,y,20,20);
        graphics.fill(ellipse);
        //graphics.setColor(new Color(255,0,0,100));
        //graphics.draw(ellipse);   //描边
        //graphics.dispose();
        outImage("PNG", outpng);
    }

    public void outImage(String type,String filePath) throws IOException {
        ImageIO.write(image, type, new File(filePath));
    }

}