package org.pujun.correl;

import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;

import java.util.Arrays;

import static java.lang.Math.abs;

/**
 * Created by milletpu on 16/4/9.
 */
public class Correlation {
    private double pearsonsResult;
    private double[] lagResult ={0,0};

    /**
     * Input two time series and get correlation value in return
     * @param x
     * @param y
     * @return
     */
    public double getPearsonsResult(double[] x, double[] y){

        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        pearsonsResult = pearsonsCorrelation.correlation(x,y);

        return pearsonsResult;
    }

    /**
     * Input two time seires then get the best lag and its correlation value in return
     * @param x
     * @param y
     * @return LagResult[0]: best lag, lagResult[1]: correlation value
     */
    public double[] getLagResult(double[] x, double[] y){  //arrayY后移lag位，arrayX前端截掉，arrayY后端截掉
        double thisLagResult = 0;
        for (int i = 0; i < x.length/2; i++) {
            x = Arrays.copyOfRange(x, i, x.length);
            y = Arrays.copyOfRange(y, 0, y.length - i);
            PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
            thisLagResult = pearsonsCorrelation.correlation(x, y);
            if (abs(thisLagResult) > lagResult[1]){
                lagResult[0] = i;
                lagResult[1] = thisLagResult;
            }
        }

        return lagResult;
    }

//    public static void main(String[] args) {
//        double[] y = {1,2,3,4,5,6,7,8,9,10};
//        double[] x = {12,1,8,7,6,5,4,3,2,1};
//        Correlation correlation = new Correlation();
//        System.out.println(correlation.getLagResult(x,y)[0]);
//        System.out.println(correlation.getLagResult(x,y)[1]);
//
//    }

}
